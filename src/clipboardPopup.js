import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {createThumbnail} from './imageHandler.js';

const PASTE_DELAY_MS = 150;

const ClipboardMenuItem = GObject.registerClass(
class ClipboardMenuItem extends PopupMenu.PopupBaseMenuItem {
    _init(entry, index, maxTextLength, thumbnailSize) {
        super._init({style_class: 'my-clipboard-item'});

        const box = new St.BoxLayout({vertical: false, x_expand: true});

        const indexLabel = new St.Label({
            text: `${index + 1}`,
            style_class: 'my-clipboard-index-label',
            y_align: Clutter.ActorAlign.CENTER,
        });
        box.add_child(indexLabel);

        if (entry.type === 'text') {
            let preview = entry.content.replace(/\n/g, ' ').trim();
            if (preview.length > maxTextLength)
                preview = `${preview.substring(0, maxTextLength)}…`;

            const label = new St.Label({
                text: preview,
                style_class: 'my-clipboard-text-preview',
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
            });
            label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
            box.add_child(label);
        } else if (entry.type === 'image' && entry.bytes) {
            const thumbnail = createThumbnail(entry.bytes, thumbnailSize);
            if (thumbnail)
                box.add_child(thumbnail);
            else {
                box.add_child(new St.Label({
                    text: '[Image]',
                    y_align: Clutter.ActorAlign.CENTER,
                }));
            }
        }

        this.add_child(box);
    }
});

export class ClipboardPopup {
    constructor(clipboardManager, settings) {
        this._clipboardManager = clipboardManager;
        this._settings = settings;
        this._indicator = null;
        this._keyPressId = null;
        this._pasteTimeoutId = null;
        this._menuDirty = true;
        this._menuOpenId = null;
        this._virtualDevice = null;
    }

    enable() {
        this._indicator = new PanelMenu.Button(0.0, 'My Clipboard', false);

        this._icon = new St.Icon({
            icon_name: 'edit-paste-symbolic',
            style_class: 'system-status-icon',
        });
        this._indicator.add_child(this._icon);

        this._buildMenu();

        this._changeCallback = () => {
            this._menuDirty = true;
        };
        this._clipboardManager.onChange(this._changeCallback);

        this._menuOpenId = this._indicator.menu.connect('open-state-changed', (_menu, isOpen) => {
            if (isOpen && this._menuDirty)
                this._buildMenu();
        });

        this._keyPressId = this._indicator.menu.actor.connect('key-press-event', (_actor, event) => {
            const keyval = event.get_key_symbol();
            if (keyval >= Clutter.KEY_1 && keyval <= Clutter.KEY_9) {
                const index = keyval - Clutter.KEY_1;
                if (index < this._clipboardManager.history.length) {
                    this._clipboardManager.selectItem(index);
                    this._indicator.menu.close();
                    this._schedulePaste();
                }
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        Main.panel.addToStatusArea('my-clipboard', this._indicator);
    }

    toggle() {
        if (this._indicator)
            this._indicator.menu.toggle();
    }

    disable() {
        if (this._pasteTimeoutId) {
            GLib.source_remove(this._pasteTimeoutId);
            this._pasteTimeoutId = null;
        }

        if (this._keyPressId && this._indicator) {
            this._indicator.menu.actor.disconnect(this._keyPressId);
            this._keyPressId = null;
        }

        if (this._menuOpenId && this._indicator) {
            this._indicator.menu.disconnect(this._menuOpenId);
            this._menuOpenId = null;
        }

        if (this._changeCallback) {
            this._clipboardManager.removeOnChange(this._changeCallback);
            this._changeCallback = null;
        }

        this._virtualDevice = null;

        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }

    _schedulePaste() {
        if (this._pasteTimeoutId) {
            GLib.source_remove(this._pasteTimeoutId);
            this._pasteTimeoutId = null;
        }

        this._pasteTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, PASTE_DELAY_MS, () => {
            this._pasteTimeoutId = null;
            this._simulatePaste();
            return GLib.SOURCE_REMOVE;
        });
    }

    _getVirtualDevice() {
        if (!this._virtualDevice) {
            const seat = Clutter.get_default_backend().get_default_seat();
            this._virtualDevice = seat.create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);
        }
        return this._virtualDevice;
    }

    _simulatePaste() {
        const vDevice = this._getVirtualDevice();

        const time = GLib.get_monotonic_time();
        vDevice.notify_keyval(time, Clutter.KEY_Control_L, Clutter.KeyState.PRESSED);
        vDevice.notify_keyval(time + 10000, Clutter.KEY_v, Clutter.KeyState.PRESSED);
        vDevice.notify_keyval(time + 20000, Clutter.KEY_v, Clutter.KeyState.RELEASED);
        vDevice.notify_keyval(time + 30000, Clutter.KEY_Control_L, Clutter.KeyState.RELEASED);
    }

    _buildMenu() {
        if (!this._indicator)
            return;

        this._menuDirty = false;
        this._indicator.menu.removeAll();

        const history = this._clipboardManager.history;
        const maxTextLength = this._settings.get_int('max-text-length');
        const thumbnailSize = this._settings.get_int('thumbnail-size');

        if (history.length === 0) {
            const emptyItem = new PopupMenu.PopupMenuItem('No clipboard history', {
                reactive: false,
                style_class: 'my-clipboard-empty-label',
            });
            this._indicator.menu.addMenuItem(emptyItem);
            return;
        }

        const scrollSection = new PopupMenu.PopupMenuSection();

        const scrollView = new St.ScrollView({
            style_class: 'my-clipboard-scroll',
            overlay_scrollbars: true,
        });

        const scrollBox = new St.BoxLayout({vertical: true});

        for (let i = 0; i < history.length; i++) {
            const entry = history[i];
            const menuItem = new ClipboardMenuItem(entry, i, maxTextLength, thumbnailSize);
            const idx = i;
            menuItem.connect('activate', () => {
                this._clipboardManager.selectItem(idx);
            });
            scrollBox.add_child(menuItem);
        }

        scrollView.set_child(scrollBox);
        scrollSection.actor.add_child(scrollView);
        this._indicator.menu.addMenuItem(scrollSection);

        this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const clearItem = new PopupMenu.PopupMenuItem('Clear All', {
            style_class: 'my-clipboard-clear-button',
        });
        clearItem.connect('activate', () => {
            this._clipboardManager.clearAll();
        });
        this._indicator.menu.addMenuItem(clearItem);
    }
}
