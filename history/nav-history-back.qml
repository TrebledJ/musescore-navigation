import QtQuick 2.0
import MuseScore 3.0
import QtQuick.Controls 1.0
import QtQuick.Dialogs 1.2
import "history.js" as H
 
MuseScore {
    id: plugin
    description: "Action to navigate back to your previous selection."
    version: "3.5.0"
    menuPath: "Plugins.History.Go Back"

    onRun: {
        if (!curScore) {
            Qt.quit();
        }

        var history = new H.History(onInfo, onError);
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

    function onLoad()
    {
        // history.records = JSON.parse(settings.value(history.loadSaveKey, "[]"));
        // console.log("loaded: %1".arg(JSON.stringify(history.records)));
    }

    function onSave()
    {
        // console.log("saving: %1 records".arg(history.records.length));
        // settings.setValue(history.loadSaveKey, JSON.stringify(history.records));
    }

    MessageDialog {
        id: dialog
        onAccepted: Qt.quit()
    }
}
