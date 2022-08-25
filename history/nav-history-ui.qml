import QtQuick 2.0
import MuseScore 3.0
import QtQuick.Controls 1.0
import QtQuick.Dialogs 1.2
import QtQuick.Layouts 1.1
import Qt.labs.settings 1.0
import "history.js" as H

MuseScore {
    id: plugin
    description: "Keeps track of your cursor so that you can jump back to where you were before."
    version: "3.0.0"
    menuPath: "Plugins.History.History UI"

    pluginType: "dock"
    requiresScore: false

    width: 100
    height: 40

    property var prevScore: null
    property var history: null

    onRun: {
        if (!curScore) {
            Qt.quit();
        }

        prevScore = curScore;

        history = new H.History(load, save, onInfo, onError);
        history.clear(); // Clear history when beginning a new session.
        history.logPosition();
    }

    onScoreStateChanged: {
        if (!curScore.is(prevScore)) {
            console.log("score changed");
            // history.clear();
            // TODO: keep history between scores.
            prevScore = curScore;
        } else if (state.selectionChanged) {
            console.log("selection changed");
            history.checkCrossUpdate();
            history.logPosition();
        }
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
        // onAccepted: Qt.quit()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 10

        RowLayout {
            width: parent.width

            Button {
                // TODO: disable buttons if no data to go to.
                Layout.fillWidth: true
                text: qsTr("<-") // TODO: replace with icons? or at least something that looks better...
                onClicked: {
                    history.logPosition(); // Save before going back.
                    history.goBack();
                    cmd("note-input");
                    cmd("note-input");
                }
            }

            Button {
                Layout.fillWidth: true
                text: qsTr("->")
                onClicked: {
                    history.goForward();
                    cmd("note-input");
                    cmd("note-input");
                }
            }
        }
    }

    Settings {
        id: settings
        category: "plugin.nav.history"
        property string records_bk: "[]"
        property string records_fw: "[]"
    }
}
