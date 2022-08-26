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
    dockArea: "top"
    requiresScore: false

    width: 100
    height: 60
    implicitHeight: 60

    property var prevScore: null
    property var history: null

    onRun: {
        if (!curScore)
            return;

        init();
        prevScore = curScore;
    }

    onScoreStateChanged: {
        if (!history) {
            init();
        }
        var log = false;
        if (!curScore.is(prevScore)) {
            changeScore();
            log = true;
        } else if (state.selectionChanged) {
            log = true;
        }
        if (log) {
            history.logPosition(true);
            history.save();
            history.printLast(5);
        }
    }

    function init()
    {
        history = new H.History(settings, onInfo, onError, 'ui');
        // history.clear(); // Clear history when beginning a new session.
        history.logPosition();
        history.save();
    }

    function changeScore()
    {
        prevScore = curScore;
        history.changeScore(curScore && curScore.scoreName);
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
                Layout.fillWidth: true
                text: qsTr("←")
                onClicked: {
                    if (!curScore.is(prevScore)) {
                        changeScore();
                    }
                    history.goBack();
                    history.save();
                    history.printLast(5);
                }
            }

            Button {
                Layout.fillWidth: true
                text: qsTr("→")
                onClicked: {
                    if (!curScore.is(prevScore)) {
                        changeScore();
                    }
                    history.goForward();
                    history.save();
                    history.printLast(5);
                }
            }
        }
    }

    // TODO: implement UI settings to configure history options.

    Settings {
        id: settings
        category: "plugin.nav.history"
        property string data: "{}"
    }
}
