# Json2GForm

This Google Script takes a JSON file saved with [GFormExporter](https://github.com/SableRaf/GFormExporter) and make a new Google Form from it.

## To Do
- [ ] shuffle choices using [onOpen()](https://stackoverflow.com/a/60115867/2126791)
- [ ] Form.setCollectEmail()
- [ ] Form.setConfirmationMessage()
- [ ] Form.setCustomClosedFormMessage()
- [ ] Form.setDestination()
- [ ] Form.setLimitOneResponsePerUser()
- [ ] Form.setProgressBar()
- [ ] Form.setPublishingSummary()
- [ ] Form.setRequireLogin()
- [ ] Form.setShowLinkToRespondAgain()
- [ ] Form.setShuffleQuestions()

## Known limitations
- There is seemingly no way to handle items of the FILE_UPLOAD type (see [this issue](https://github.com/stevenschmatz/export-google-form/issues/4))
- Support for Quiz forms is out of scope for now