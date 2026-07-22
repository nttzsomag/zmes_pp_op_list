sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension"
], function(ControllerExtension) {
  "use strict";

  /*return ControllerExtension.extend("zmes.zmesppoplist.ext.controller.CustomActions", {
    override: {
      editFlow: {
        invokeAction: function(sAction, mParameters) {
          console.log("invokeAction:", sAction);
          var that = this;
          return this.base.editFlow.invokeAction(sAction, mParameters).then(function() {
            if (sAction.endsWith("changeWorkCenter")) {
              that.getExtensionAPI().refresh();
            }
          });
        }
      }
    }
  });*/
});