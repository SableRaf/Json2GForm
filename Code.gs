// Google Form API Reference
// - App Script: https://developers.google.com/apps-script/reference/forms
// - REST: https://developers.google.com/forms/api/reference/rest

// TO DOs
// - [x] set goToPage on choices (use IDs to get PageBreakItem)
// - [x] handle linear scale
// - [x] warning for duplicate page titles
// - [x] handle multiple choice grid
// - [x] handle required
// - [x] handle "after section" page navigation type
// - [ ] handle "after section" goToPage
//       - [ ] encapsulate getting goToPage from title

// References
// https://stackoverflow.com/questions/53096914/google-script-forms-listitem-how-to-set-pagebreakitems-for-each-choice

// var jsonFilename = "source-json.html";
var jsonFilename = "dummy-json.html";
// var jsonFilename = "duplicateTitles-json.html";

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

const pageNavigationEnum = {
  CONTINUE: "CONTINUE",
  GO_TO_PAGE: "GO_TO_PAGE",
  RESTART: "RESTART",
  SUBMIT: "SUBMIT",
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

  // Look for sections with the same title
  // Duplicates will lead to wrong goTo targets
  var titles = form
    .getItems(FormApp.ItemType.PAGE_BREAK)
    .map((item) => item.getTitle());
  if (hasDuplicates_(titles)) {
    Logger.log(`🟡 Warning: found multiple PageBreakItem with the same title.`);
    for (var t of getDuplicatesFrom_(titles)) {
      Logger.log(`🟡 Duplicate: "${t}"`);
    }
  }

  // set properties of each item
  for (entry of itemDict) {
    // Logger.log(entry.obj.title);
    setItemProperties_(form, entry.id, entry.obj);
  }

  Logger.log("Published URL: " + form.getPublishedUrl());
  Logger.log("Editor URL: " + form.getEditUrl());
}

// Fill in the item properties
function setItemProperties_(form, id, jsonObj) {
  var item = getTypedItem_(form.getItemById(id));
  var itemType = jsonObj.type;

  Logger.log(`Setting properties for item "${jsonObj.title}" (${itemType})`);

  // set help text
  if (jsonObj.hasOwnProperty("helpText")) {
    item.setHelpText(jsonObj.helpText);
  }

  // set required
  if (jsonObj.hasOwnProperty("isRequired")) {
    item.setRequired(jsonObj.isRequired);
  }

  // set type specific properties
  switch (itemType) {
    case typeEnum.SCALE:
      var missingProperties = false;
      var requiredProperties = [
        "leftLabel",
        "rightLabel",
        "lowerBound",
        "upperBound",
      ];
      for (prop of requiredProperties) {
        if (!jsonObj.hasOwnProperty(prop)) {
          missingProperties = true;
          Logger.log(`🟡 Warning: "${jsonObj.title}" has no property: ${prop}`);
        }
      }
      if (!missingProperties) {
        const { lowerBound, upperBound, leftLabel, rightLabel } = jsonObj;
        item.setBounds(lowerBound, upperBound);
        item.setLabels(leftLabel, rightLabel);
      }
      break;
    case typeEnum.MULTIPLE_CHOICE || typeEnum.CHECKBOX || typeEnum.LIST:
      if (!jsonObj.hasOwnProperty("choices")) {
        Logger.log(
          `🟡 Warning: "${jsonObj.title}" (${itemType}) has no property: choices`
        );
      } else {
        item.setChoices(getChoices_(item, form, jsonObj));
      }
      break;
    case typeEnum.PAGE_BREAK:
      if (!jsonObj.hasOwnProperty("goToPage")) {
        Logger.log(`🟡 Warning: "${jsonObj.title}" has no property: goToPage`);
      } else {
        //item.setGoToPage(jsonObj.goToPage); // TO DO make it a PageBreakItem
      }
      if (!jsonObj.hasOwnProperty("pageNavigationType")) {
        Logger.log(
          `🟡 Warning: "${jsonObj.title}" has no property: pageNavigationType`
        );
      } else {
        var navType = getNavigationTypeFrom_(jsonObj.pageNavigationType);
        item.setGoToPage(navType);
      }
      break;
    case typeEnum.GRID || typeEnum.CHECKBOX_GRID:
      if (!jsonObj.hasOwnProperty("rows")) {
        Logger.log(
          `🟡 Warning: "${jsonObj.title}" (${itemType}) has no property: rows`
        );
      } else {
        item.setRows(jsonObj.rows);
      }
      if (!jsonObj.hasOwnProperty("columns")) {
        Logger.log(
          `🟡 Warning: "${jsonObj.title}" (${itemType}) has no property: columns`
        );
      } else {
        item.setColumns(jsonObj.columns);
      }
      break;
  }
  // set hasOtherOption if the item has the property
  if (jsonObj.hasOwnProperty("hasOtherOption")) {
    item.showOtherOption(jsonObj.hasOtherOption);
  }
}

function getChoices_(item, form, jsonObj) {
  var choices = [];
  if (jsonObj.hasOwnProperty("goToPages")) {
    for (let i = 0; i < jsonObj.choices.length; i++) {
      var choice = jsonObj.choices[i];
      // get goToId from the title of the goToPage
      var goToId = null;
      for (pageBreakItem of form.getItems(FormApp.ItemType.PAGE_BREAK)) {
        if (pageBreakItem.getTitle() == jsonObj.goToPages[i]) {
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
    for (choice of jsonObj.choices) {
      // add choice without goToPage
      choices.push(item.createChoice(choice));
    }
  }
  return choices;
}

function getNavigationTypeFrom_(str) {
  switch (str) {
    case pageNavigationEnum.CONTINUE:
      return FormApp.PageNavigationType.CONTINUE;
    case pageNavigationEnum.RESTART:
      return FormApp.PageNavigationType.RESTART;
    case pageNavigationEnum.GO_TO_PAGE:
      return FormApp.PageNavigationType.GO_TO_PAGE;
    case pageNavigationEnum.SUBMIT:
      return FormApp.PageNavigationType.SUBMIT;
    default:
      return FormApp.PageNavigationType.CONTINUE;
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

function hasDuplicates_(arr) {
  let set = new Set();
  return arr.some((el) => {
    if (set.has(el)) return true;
    set.add(el);
  });
}

// https://flexiple.com/javascript/find-duplicates-javascript-array/
function getDuplicatesFrom_(arr) {
  const uniqueElements = new Set(arr);
  const filteredElements = arr.filter((item) => {
    if (uniqueElements.has(item)) {
      uniqueElements.delete(item);
    } else {
      return item;
    }
  });

  // code from flexiple was broken: return [...new Set(uniqueElements)];
  // uniqueElements ends up empty after filter() is done
  return [...new Set(filteredElements)];
}
