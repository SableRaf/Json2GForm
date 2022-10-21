// Google Form API Reference
// - App Script: https://developers.google.com/apps-script/reference/forms
// - REST: https://developers.google.com/forms/api/reference/rest

// TO DOs
// - [ ] set goToPage on choices (use IDs to get PageBreakItem) FIX THIS line 80
//       Here's what needs to happen: - create all the items in the form (don't create the choices yet)
//                                    - store the ids and names of BreakPageItems as key/value pairs (names must be unique)
//                                    - create choices for choice items together with the goToPage

// References
// https://stackoverflow.com/questions/53096914/google-script-forms-listitem-how-to-set-pagebreakitems-for-each-choice

// var jsonFilename = "source-json.html";
var jsonFilename = "dummy-json.html";

var formTitlePrefix = '(deleteMe) '; // for debuging

// App Script doesn't let you upload JSON files
// As a workaround, we parse the JSON from a HTML file 
const jsonString = HtmlService.createHtmlOutputFromFile(jsonFilename).getContent();
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
  var form = FormApp.create(formTitlePrefix + 'New Form');
  var item = form.addCheckboxItem();
  Logger.log('Published URL: ' + form.getPublishedUrl());
  Logger.log('Editor URL: ' + form.getEditUrl());
}

function createForm() {
  var form = FormApp.create(formTitlePrefix + jsonObject.metadata.title);

  form.setDescription(jsonObject.metadata.description);

  for (obj of jsonObject.items) {
    // make item of the proper type
    var item = createItem(form, obj);
    // set title
    item.setTitle(obj.title);
    // set help text
    if (obj.hasOwnProperty("helpText")) {
      item.setHelpText(obj.helpText);
    }
    // set hasOtherOption if the item has the property
    if (obj.hasOwnProperty("hasOtherOption")) {
      item.showOtherOption(obj.hasOtherOption);
    }
    // set required
    if (obj.hasOwnProperty("required")) {
      item.setRequired(obj.required);
    }
    // add choices
    var choices = [];
    if (obj.hasOwnProperty("choices")) {
      if (obj.hasOwnProperty("goToPages")) {
        for (choice of obj.choices) {
          // add choice with goToPage
          var i = obj.choices.indexOf(choice);
          var goToPage = form.getItemById(obj.goToIds[i]);
          choices.push(item.createChoice(choice, goToPage)); // FIX THIS so that goToPage isn't null
        }
      } else {
        for (choice of obj.choices) {
          // add choice without goToPage
          choices.push(item.createChoice(choice));
        }
      }
      item.setChoices(choices);
    }
  }
  Logger.log("Published URL: " + form.getPublishedUrl());
  Logger.log("Editor URL: " + form.getEditUrl());
}

function createItem(form, jsonObj) {
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
      Logger.log('Unknown item type: ' + jsonObj.type);
      return null;
  }
}




