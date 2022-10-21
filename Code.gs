// Google Form API Reference
// - App Script: https://developers.google.com/apps-script/reference/forms
// - REST: https://developers.google.com/forms/api/reference/rest

// TO DOs
// - [x] set goToPage on choices (use IDs to get PageBreakItem)
// - [ ]

// References
// https://stackoverflow.com/questions/53096914/google-script-forms-listitem-how-to-set-pagebreakitems-for-each-choice

// var jsonFilename = "source-json.html";
var jsonFilename = "dummy-json.html";

var formTitlePrefix = "(deleteMe) "; // for debuging

// App Script doesn't let you upload JSON files
// As a workaround, we parse the JSON from a HTML file
const jsonString =
  HtmlService.createHtmlOutputFromFile(jsonFilename).getContent();
const jsonObject = JSON.parse(jsonString);

const typeEnum = {
  CHECKBOX: "CHECKBOX",
  CHECKBOX_GRID: "CHECKBOX_GRID",
  DATE: "DATE",
  DATETIME: "DATETIME",
  DURATION: "DURATION",
  GRID: "GRID",
  IMAGE: "IMAGE",
  LIST: "LIST",
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  PAGE_BREAK: "PAGE_BREAK",
  PARAGRAPH_TEXT: "PARAGRAPH_TEXT",
  SCALE: "SCALE",
  SECTION_HEADER: "SECTION_HEADER",
  TEXT: "TEXT",
  TIME: "TIME",
  VIDEO: "VIDEO",
  FILE_UPLOAD: "FILE_UPLOAD",
};

// Make a minimal form (for testing)
function createDummyForm() {
  var form = FormApp.create(formTitlePrefix + "New Form");
  var item = form.addCheckboxItem();
  Logger.log("Published URL: " + form.getPublishedUrl());
  Logger.log("Editor URL: " + form.getEditUrl());
}

function createForm() {
  var form = FormApp.create(formTitlePrefix + jsonObject.metadata.title);
  form.setDescription(jsonObject.metadata.description);

  var itemDict = [];

  for (obj of jsonObject.items) {
    // create item of the proper type
    var item = createItem_(form, obj);
    // set title
    item.setTitle(obj.title);
    // temporarily save the item's id and corresponding object
    // Logger.log(`${obj.title} : ${item.getId()}`);
    itemDict.push({ id: item.getId(), obj: obj });
  }

  // Logger.log(`---`);

  // set properties of each item
  for (entry of itemDict) {
    // Logger.log(entry.obj.title);
    setItemProperties_(form, entry.id, entry.obj);
  }

  Logger.log("Published URL: " + form.getPublishedUrl());
  Logger.log("Editor URL: " + form.getEditUrl());
}

// Fill in the item properties
function setItemProperties_(form, id, obj) {
  var itemType = form.getItemById(id).getType();
  // Logger.log(`"${obj.title}" (${itemType}) id: ${id}`);
  var item = getTypedItem_(form.getItemById(id));
  // set help text
  if (obj.hasOwnProperty("helpText")) {
    item.setHelpText(obj.helpText);
  }
  // set required
  if (obj.hasOwnProperty("required")) {
    item.setRequired(obj.required);
  }
  // add choices
  var choices = [];
  if (obj.hasOwnProperty("choices")) {
    if (obj.hasOwnProperty("goToPages")) {
      for (let i = 0; i < obj.choices.length; i++) {
        var choice = obj.choices[i];
        // var goToId = obj.goToIds[i]; // wrong ids (these are from the old form)
        // get goToId from the title of the goToPage
        var pageBreakItemList = form.getItems(FormApp.ItemType.PAGE_BREAK);
        var goToId = null;
        for (pageBreakItem of pageBreakItemList) {
          if (pageBreakItem.getTitle() == obj.goToPages[i]) {
            goToId = pageBreakItem.getId();
          }
        }
        if (isNull_(goToId)) {
          // Choices that use page navigation cannot be combined in
          // the same item with choices that do not use page navigation.
          // However we can set the PageNavigationType GO_TO_PAGE
          // without actually setting a target PageBreakItem
          choices.push(
            item.createChoice(choice, FormApp.PageNavigationType.GO_TO_PAGE)
          );
        } else {
          var targetItem = form.getItemById(goToId);
          var targetPage = getTypedItem_(targetItem);
          Logger.log(
            `${choice}: ${goToId} : ${targetPage.getTitle()} : ${typeof targetPage}`
          );
          choices.push(item.createChoice(choice, targetPage));
        }
      }
    } else {
      for (choice of obj.choices) {
        // add choice without goToPage
        choices.push(item.createChoice(choice));
      }
    }
    item.setChoices(choices);
  }
  // set hasOtherOption if the item has the property
  if (obj.hasOwnProperty("hasOtherOption")) {
    item.showOtherOption(obj.hasOtherOption);
  }
}

// Add an item of the proper type to the form and return it
function createItem_(form, jsonObj) {
  switch (jsonObj.type) {
    case typeEnum.CHECKBOX:
      return form.addCheckboxItem();
    case typeEnum.CHECKBOX_GRID:
      return form.addCheckboxGridItem();
    case typeEnum.DATE:
      return form.addDateItem();
    case typeEnum.DATETIME:
      return form.addDateTimeItem();
    case typeEnum.DURATION:
      return form.addDurationItem();
    case typeEnum.GRID:
      return form.addGridItem();
    case typeEnum.IMAGE:
      return form.addImageItem();
    case typeEnum.LIST:
      return form.addListItem();
    case typeEnum.MULTIPLE_CHOICE:
      return form.addMultipleChoiceItem();
    case typeEnum.PAGE_BREAK:
      return form.addPageBreakItem();
    case typeEnum.PARAGRAPH_TEXT:
      return form.addParagraphTextItem();
    case typeEnum.SCALE:
      return form.addScaleItem();
    case typeEnum.SECTION_HEADER:
      return form.addSectionHeaderItem();
    case typeEnum.TEXT:
      return form.addTextItem();
    case typeEnum.TIME:
      return form.addTimeItem();
    case typeEnum.VIDEO:
      return form.addVideoItem();
    case typeEnum.FILE_UPLOAD:
      return form.addFileUploadItem();
    default:
      Logger.log("Unknown item type: " + jsonObj.type);
      return null;
  }
}

/**
 * Automatically cast a generic item to its typed equivalent
 * @param item: generic item
 * @returns the typed version of that item
 */
function getTypedItem_(item) {
  // Downcast items to access type-specific properties
  var typeString = item.getType().toString();
  if (typeString === "DATETIME") typeString = "DATE_TIME"; // handle the corner case of DATETIME
  var itemTypeConstructorName = snakeCaseToCamelCase_(
    "AS_" + typeString + "_ITEM"
  );
  return item[itemTypeConstructorName]();
}

/**
 * Converts a SNAKE_CASE string to a camelCase string.
 * @param s: string in snake_case
 * @returns (string) the camelCase version of that string
 */
function snakeCaseToCamelCase_(s) {
  return s.toLowerCase().replace(/(\_\w)/g, function (m) {
    return m[1].toUpperCase();
  });
}

function isNull_(objectToTest) {
  return typeof objectToTest === "object" && !objectToTest;
}
