import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class MyClipboardPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'edit-paste-symbolic',
        });
        window.add(page);

        const historyGroup = new Adw.PreferencesGroup({
            title: 'History',
            description: 'Configure clipboard history behavior',
        });
        page.add(historyGroup);

        const maxHistoryRow = new Adw.SpinRow({
            title: 'Maximum history size',
            subtitle: 'Number of clipboard entries to keep',
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 200,
                step_increment: 5,
                page_increment: 10,
                value: settings.get_int('max-history-size'),
            }),
        });
        settings.bind('max-history-size', maxHistoryRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        historyGroup.add(maxHistoryRow);

        const displayGroup = new Adw.PreferencesGroup({
            title: 'Display',
            description: 'Configure how clipboard entries are shown',
        });
        page.add(displayGroup);

        const maxTextRow = new Adw.SpinRow({
            title: 'Text preview length',
            subtitle: 'Maximum characters shown in preview',
            adjustment: new Gtk.Adjustment({
                lower: 50,
                upper: 500,
                step_increment: 10,
                page_increment: 50,
                value: settings.get_int('max-text-length'),
            }),
        });
        settings.bind('max-text-length', maxTextRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        displayGroup.add(maxTextRow);

        const imageGroup = new Adw.PreferencesGroup({
            title: 'Images',
            description: 'Configure image clipboard handling',
        });
        page.add(imageGroup);

        const storeImagesRow = new Adw.SwitchRow({
            title: 'Store images',
            subtitle: 'Save image clipboard entries to history',
        });
        settings.bind('store-images', storeImagesRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        imageGroup.add(storeImagesRow);

        const thumbnailRow = new Adw.SpinRow({
            title: 'Thumbnail size',
            subtitle: 'Size of image thumbnails in pixels',
            adjustment: new Gtk.Adjustment({
                lower: 32,
                upper: 256,
                step_increment: 8,
                page_increment: 32,
                value: settings.get_int('thumbnail-size'),
            }),
        });
        settings.bind('thumbnail-size', thumbnailRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        imageGroup.add(thumbnailRow);
    }
}
