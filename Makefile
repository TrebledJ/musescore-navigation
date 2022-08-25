##
## Building navigation satellites...
## Working...
## Compressing navigation nanobots...
##


BUILD_DIR := build
ZIP_NAME := v3.0.0

BOOKMARK_PATH := bookmark
BOOKMARK_FILES := bookmarks.js 
BOOKMARK_FILES += nav-bookmark-clear-all.qml
BOOKMARK_FILES += nav-bookmark-next.qml
BOOKMARK_FILES += nav-bookmark-prev.qml
BOOKMARK_FILES += nav-bookmark-toggle.qml

HISTORY_PATH := history
HISTORY_FILES := history.js
HISTORY_FILES += nav-history-back.qml
HISTORY_FILES += nav-history-forward.qml
HISTORY_FILES += nav-history-ui.qml

UTIL_FILES := nav-utils.js
UTIL_FILES += README.md


# --------------------------------------------------------------------------------


.PHONY: all clean

all: mkdir utils bookmark history zip

clean:
	rm -rf $(BUILD_DIR)

mkdir:
	mkdir -p $(BUILD_DIR)

zip:
	cd $(BUILD_DIR) && zip -r "$(ZIP_NAME).zip" . -x ".*" -x "__MACOSX"

utils: $(UTIL_FILES)
	cp "$^" $(BUILD_DIR)

bookmark: subdir = $(BOOKMARK_PATH)
bookmark: bookmark-mkdir $(BOOKMARK_FILES)

history: subdir = $(HISTORY_PATH)
history: history-mkdir $(HISTORY_FILES)

%-mkdir:
	mkdir -p $(BUILD_DIR)/$(subdir)

%.js %.qml:
	cp "$(subdir)/$@" $(BUILD_DIR)/$(subdir)
