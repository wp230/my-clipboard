import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

const CACHE_DIR = GLib.build_filenamev([GLib.get_user_cache_dir(), 'my-clipboard']);
const IMAGES_DIR = GLib.build_filenamev([CACHE_DIR, 'images']);
const HISTORY_FILE = GLib.build_filenamev([CACHE_DIR, 'history.json']);

export class HistoryManager {
    constructor() {
        this._ensureDirs();
    }

    _ensureDirs() {
        for (const dir of [CACHE_DIR, IMAGES_DIR]) {
            const file = Gio.File.new_for_path(dir);
            if (!file.query_exists(null))
                file.make_directory_with_parents(null);
        }
    }

    load() {
        const file = Gio.File.new_for_path(HISTORY_FILE);
        if (!file.query_exists(null))
            return [];

        try {
            const [ok, contents] = file.load_contents(null);
            if (!ok)
                return [];

            const decoder = new TextDecoder('utf-8');
            const json = decoder.decode(contents);
            const entries = JSON.parse(json);

            return entries.map(entry => {
                if (entry.type === 'image' && entry.imagePath) {
                    const imgFile = Gio.File.new_for_path(entry.imagePath);
                    if (imgFile.query_exists(null)) {
                        try {
                            const [imgOk, imgContents] = imgFile.load_contents(null);
                            if (imgOk)
                                entry.bytes = GLib.Bytes.new(imgContents);
                        } catch (e) {
                            logError(e, 'Failed to load image');
                        }
                    }
                }
                return entry;
            });
        } catch (e) {
            logError(e, 'Failed to load clipboard history');
            return [];
        }
    }

    save(history) {
        const imagePaths = new Map();

        const serializable = history.map(entry => {
            const obj = {
                type: entry.type,
                content: entry.content,
                timestamp: entry.timestamp,
            };

            if (entry.type === 'image' && entry.bytes) {
                const path = entry.imagePath ?? this._saveImage(entry.bytes, entry.timestamp);
                obj.imagePath = path;
                imagePaths.set(entry, path);
            }

            return obj;
        });

        for (const [entry, path] of imagePaths) {
            entry.imagePath = path;
        }

        try {
            const json = JSON.stringify(serializable, null, 2);
            const file = Gio.File.new_for_path(HISTORY_FILE);
            const encoder = new TextEncoder();
            const bytes = encoder.encode(json);
            file.replace_contents(
                bytes, null, false,
                Gio.FileCreateFlags.REPLACE_DESTINATION, null
            );
        } catch (e) {
            logError(e, 'Failed to save clipboard history');
        }
    }

    _saveImage(bytes, timestamp) {
        const filename = `${timestamp}.png`;
        const path = GLib.build_filenamev([IMAGES_DIR, filename]);
        const file = Gio.File.new_for_path(path);

        try {
            const outputStream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
            outputStream.write_bytes(bytes, null);
            outputStream.close(null);
            return path;
        } catch (e) {
            logError(e, 'Failed to save image');
            return null;
        }
    }

    cleanupImages(activeHistory) {
        const activePaths = new Set(
            activeHistory
                .filter(e => e.type === 'image' && e.imagePath)
                .map(e => e.imagePath)
        );

        try {
            const dir = Gio.File.new_for_path(IMAGES_DIR);
            const enumerator = dir.enumerate_children(
                'standard::name', Gio.FileQueryInfoFlags.NONE, null
            );

            let info;
            while ((info = enumerator.next_file(null)) !== null) {
                const name = info.get_name();
                const fullPath = GLib.build_filenamev([IMAGES_DIR, name]);
                if (!activePaths.has(fullPath)) {
                    const file = Gio.File.new_for_path(fullPath);
                    file.delete(null);
                }
            }
            enumerator.close(null);
        } catch (e) {
            logError(e, 'Failed to cleanup images');
        }
    }
}
