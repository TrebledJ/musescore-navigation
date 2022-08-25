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
        var history = new H.History(settings, onInfo, onError, 'go-back');
        history.setReadonly();
        history.goBack();
        history.printLast();
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

    MessageDialog {
        id: dialog
    }

    Settings {
        id: settings
        category: "plugin.nav.history"
        property string data: "{}"
    }
}
