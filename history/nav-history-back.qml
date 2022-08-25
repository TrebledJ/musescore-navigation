import QtQuick 2.0
import MuseScore 3.0
import QtQuick.Controls 1.0
import QtQuick.Dialogs 1.2
import Qt.labs.settings 1.0
import "history.js" as H
 
MuseScore {
    id: plugin
    description: "Action to navigate back to your previous selection."
    version: "3.0.0"
    menuPath: "Plugins.History.Go Back"

    onRun: {
        if (!curScore) {
            Qt.quit();
        }

        var history = new H.History(load, save, onInfo, onError);
        history.goBack();
        Qt.quit();
    }

    function onInfo(msg)
    {
        dialog.text = msg;
        dialog.title = qsTr("Info");
        dialog.icon = StandardIcon.Information;
        dialog.open();
    }

    function onError(msg)
    {
        dialog.text = qsTr("Error") + ": " + msg;
        dialog.title = qsTr("Error");
        dialog.icon = StandardIcon.Warning;
        dialog.open();
    }

    function load(key)
    {
        return JSON.parse(settings[key]);
    }

    function save(key, value)
    {
        settings[key] = JSON.stringify(value);
    }

    MessageDialog {
        id: dialog
        onAccepted: Qt.quit()
    }

    Settings {
        id: settings
        category: "plugin.nav.history"
        property string records_bk: "[]"
        property string records_fw: "[]"
    }
}
