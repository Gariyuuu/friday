use std::net::TcpStream;
use std::time::{Duration, Instant};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use tauri_plugin_shell::ShellExt;

// The distributable build has no live `next dev` process to point at (that
// only exists in `desktop:dev`, via tauri.conf.json's devUrl) — instead it
// bundles a self-contained Next.js standalone server (see
// scripts/prepare-desktop-build.sh) and a real, portable Node binary
// (src-tauri/binaries/node-*, vendored from nodejs.org — NOT the Homebrew
// build, which dynamically links dozens of Homebrew-managed dylibs and
// isn't portable outside a Homebrew install, found by testing). This port
// is deliberately different from devUrl's 1420 so the two modes are never
// confused with each other.
const SERVER_PORT: u16 = 1421;

fn wait_for_server_ready(port: u16, timeout: Duration) -> bool {
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        if TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Only the packaged build needs the sidecar — `desktop:dev`
            // already has a live `next dev` at devUrl (localhost:1420),
            // which this setup hook has no reason to duplicate or race with.
            if !cfg!(debug_assertions) {
                let resource_dir = app.path().resource_dir()?;
                let server_dir = resource_dir.join("server");
                let server_entry = server_dir.join("server.js");

                let (mut rx, _child) = app
                    .shell()
                    .sidecar("node")
                    .expect("failed to resolve the bundled node sidecar binary")
                    .current_dir(server_dir)
                    .env("PORT", SERVER_PORT.to_string())
                    .args([server_entry.to_string_lossy().to_string()])
                    .spawn()
                    .expect("failed to spawn the bundled FRIDAY server");

                // Surface sidecar stdout/stderr through the app's own logger
                // instead of letting it vanish — the same discipline this
                // project applies everywhere else (never silently swallow a
                // subprocess's output).
                tauri::async_runtime::spawn(async move {
                    use tauri_plugin_shell::process::CommandEvent;
                    while let Some(event) = rx.recv().await {
                        match event {
                            CommandEvent::Stdout(line) => {
                                log::info!("[server] {}", String::from_utf8_lossy(&line));
                            }
                            CommandEvent::Stderr(line) => {
                                log::warn!("[server] {}", String::from_utf8_lossy(&line));
                            }
                            CommandEvent::Terminated(payload) => {
                                log::warn!("[server] process terminated: {payload:?}");
                            }
                            _ => {}
                        }
                    }
                });

                // A freshly-placed copy of this binary (e.g. right after
                // `pnpm desktop:build`, or the first launch from a new
                // location) can take noticeably longer to start than a
                // warm one — macOS re-verifies a binary's signature the
                // first time it's executed from a given path/inode, even
                // for an ad-hoc-signed app. Found by testing: a copy to
                // ~/Applications took ~15-20s on its first launch vs ~5s
                // once warmed up. 45s gives real first-launch headroom.
                if !wait_for_server_ready(SERVER_PORT, Duration::from_secs(45)) {
                    log::error!("bundled FRIDAY server did not become ready in time");
                } else if let Some(window) = app.get_webview_window("main") {
                    let url = format!("http://127.0.0.1:{SERVER_PORT}").parse().unwrap();
                    let _ = window.navigate(url);
                }
            }

            // Menu bar presence (spec §11/§41) — a tray icon with quick access back
            // to the window, plus Quit. Left-clicking the icon shows/focuses the
            // window rather than opening the menu (the menu still opens on
            // right-click/normal tray-menu interaction).
            let show_item = MenuItem::with_id(app, "show", "Show FRIDAY", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            TrayIconBuilder::new()
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
