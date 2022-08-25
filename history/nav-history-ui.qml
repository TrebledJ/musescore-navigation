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
        if (!curScore)
            return;

        prevScore = curScore;
    }

    onScoreStateChanged: {
        if (!history) {
            init();
        }
        if (!curScore.is(prevScore)) {
            console.log("score changed");
            // history.clear();
            // TODO: keep history between scores.
            prevScore = curScore;
        } else if (state.selectionChanged) {
            history.logPosition(true);
        }
    }

    function init()
    {
        history = new H.History(settings, onInfo, onError, 'ui');
        history.clear(); // Clear history when beginning a new session.
        history.logPosition();
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
                    history.printLast(5);
                    history.save();
                }
            }

            Button {
                Layout.fillWidth: true
                text: qsTr("->")
                onClicked: {
                    history.goForward();
                    history.printLast(5);
                    history.save();
                }
            }
        }
    }

    Settings {
        id: settings
        category: "plugin.nav.history"
        property string recordsBk: "[]"
        property string recordsFw: "[]"
        property string currRecord: "{}"
    }
}
