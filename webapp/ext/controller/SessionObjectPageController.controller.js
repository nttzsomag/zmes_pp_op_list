sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension",
  "sap/m/MessageToast",
  "zmes/zmesppoplist/ext/controller/ScanHandler"
], function (ControllerExtension, MessageToast, ScanHandler) {
  "use strict";

  return ControllerExtension.extend("zmes.zmesppoplist.ext.controller.SessionObjectPageController", {
    override: {
      onInit: function () {
        var oView = this.getView();
        var sTableId = "zmes.zmesppoplist::SessionObjectPage--fe::table::_AppNav::LineItem";
        var oTable = oView.byId(sTableId) || sap.ui.getCore().byId(sTableId);
        if (oTable) {
          oTable.attachRowPress(this._onRowPress.bind(this));
        }

        ScanHandler.onScanBarcode = function () {
          ScanHandler.openScanDialog(this._onScanResult.bind(this));
        }.bind(this);

        ScanHandler.onClearScan = function () {
          this._onScanResult("");
        }.bind(this);
      },

/*editFlow: {
  invokeAction: function (sAction, mParameters) {
    console.log("invokeAction:", sAction);
    var that = this;
    return this.base.editFlow.invokeAction(sAction, mParameters).then(function () {
      if (sAction.endsWith("changeWorkCenter")) {
        that.getExtensionAPI().refresh();
      }
    });
  }
}*/
    },

    _onScanResult: function (sBarcode) {
      var oClearBtn = sap.ui.getCore().byId(
        "zmes.zmesppoplist::SessionObjectPage--fe::table::_Operations::LineItem::CustomAction::clearScan"
      );

      var sTableId = "zmes.zmesppoplist::SessionObjectPage--fe::table::_Operations::LineItem";
      var oTable = this.getView().byId(sTableId) || sap.ui.getCore().byId(sTableId);

      if (!oTable) {
        console.warn("Operations table not found");
        return;
      }

      var oInnerTable = oTable.getAggregation("_content");
      var oBinding = oInnerTable && oInnerTable.getBinding("items");

      if (!oBinding) {
        console.warn("No binding found");
        return;
      }

      if (!sBarcode) {
        oBinding.filter([]);
        oClearBtn && oClearBtn.setVisible(false);
        return;
      }

      var oModel = this.getView().getModel();
      var sSessionPath = this.getView().getBindingContext().getPath();

      var oOperation = oModel.bindContext(
        sSessionPath + "/_Operations/com.sap.gateway.srvd.zui_mes_pp_operation.v0001.resolveScan(...)"
      );
      oOperation.setParameter("barcode_value", sBarcode);

      oOperation.execute().then(function () {
        var aResults = oOperation.getBoundContext().getObject().value;

        if (!aResults || aResults.length === 0) {
          MessageToast.show("Nincs találat");
          oBinding.filter([]);
          oClearBtn && oClearBtn.setVisible(false);
          return;
        }

        var aFilters = aResults.map(function (oOp) {
          return new sap.ui.model.Filter(
            "OrderOperationBarcode",
            sap.ui.model.FilterOperator.EQ,
            oOp.OrderOperationBarcode
          );
        });

        var oCombinedFilter = new sap.ui.model.Filter({ filters: aFilters, and: false });
        oBinding.filter([oCombinedFilter]);
        oClearBtn && oClearBtn.setVisible(true);
      }).catch(function (oError) {
        console.error("resolveScan error:", oError);
      });
    },

    _onRowPress: function (oEvent) {
      var oBindingContext = oEvent.getParameter("bindingContext");
      if (!oBindingContext) return;

      oBindingContext.requestProperty(["ToSemObj", "ToSemAction"])
        .then(function (aValues) {
          var sToSemObj = aValues[0];
          var sToSemAction = aValues[1];
          if (sToSemObj && sToSemAction) {
            sap.ushell.Container.getService("CrossApplicationNavigation").toExternal({
              target: { semanticObject: sToSemObj, action: sToSemAction }
            });
          }
        });
    }
  });
});