import Gio from 'gi://Gio';
import St from 'gi://St';

export function createThumbnail(bytes, size) {
    if (!bytes || bytes.get_size() === 0)
        return null;

    const gicon = Gio.BytesIcon.new(bytes);
    return new St.Icon({
        gicon,
        icon_size: size,
        style_class: 'my-clipboard-image-thumbnail',
    });
}

export function hasImageMime(clipboard) {
    const mimeTypes = clipboard.get_mimetypes(St.ClipboardType.CLIPBOARD);
    return mimeTypes?.some(m => m.startsWith('image/')) ?? false;
}
