sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension",
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/Table",
  "sap/m/Column",
  "sap/m/ColumnListItem",
  "sap/m/ObjectIdentifier",
  "sap/m/Button",
  "sap/m/Text",
  "sap/ui/model/Filter",
  "zmes/zmesppoplist/ext/controller/ScanHandler"
], function (ControllerExtension, MessageToast, Dialog, Table, Column, ColumnListItem, ObjectIdentifier, Button, Text, Filter, ScanHandler) {
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
      }
    },

    // ====== Közös GOS dokumentum-dialógus ======
    _showGosDocumentsDialog: function (oSourceControl, aFilters, sDialogTitle) {
      console.log("[GOS dialog] cím:", sDialogTitle, "szűrők:", aFilters);

      var oTable = new Table({
        columns: [
          new Column({ header: new Text({ text: "Leírás" }) }),
          new Column({ header: new Text({ text: "Létrehozva" }) })
        ]
      });

      oTable.bindItems({
        path: "/GosUrlLink",
        model: "gosModel",
        filters: aFilters,
        parameters: {
          $select: "GuidId,Description,CreatedOn,Url"
        },
        events: {
          dataReceived: function (oDataEvent) {
            var oData = oDataEvent.getParameter("data");
            var oError = oDataEvent.getParameter("error");
            console.log("[GOS dialog] dataReceived - találatok:", oData && oData.value ? oData.value.length : oData, "hiba:", oError);
          }
        },
        template: new ColumnListItem({
          type: "Active",
          press: function (oItemEvent) {
            var oCtx = oItemEvent.getSource().getBindingContext("gosModel");
            var sUrl = oCtx.getProperty("Url");
            window.open(sUrl, "_blank");
          },
          cells: [
            new ObjectIdentifier({ title: "{gosModel>Description}" }),
            new Text({ text: "{gosModel>CreatedOn}" })
          ]
        })
      });

      var oDialog = new Dialog({
        title: sDialogTitle,
        contentWidth: "30rem",
        content: [oTable],
        beginButton: new Button({
          text: "Bezár",
          press: function () { oDialog.close(); }
        }),
        afterClose: function () { oDialog.destroy(); }
      });

      oSourceControl.addDependent(oDialog);
      oDialog.open();
    },

    // ====== Csatolt dokumentumok - cikkhez kötve (_Operations tábla) ======
    onShowGosDocuments: function (oEvent) {
      var oSource = oEvent.getSource();
      var oRowContext = oSource.getBindingContext();
      if (!oRowContext) {
        console.warn("### DEBUG: onShowGosDocuments - nincs sor kontextus");
        return;
      }

      oRowContext.requestProperty(["Material", "ProductDocumentNumber"]).then(function (aValues) {
        var sMaterial = aValues[0];
        var sProductDocumentNumber = aValues[1];

        this._showGosDocumentsDialog(oSource, [
          new Filter("BoObjType", "EQ", "BUS1001006"),
          new Filter("BoObjKey", "EQ", sMaterial),
          new Filter("DescriptionUpper", "EQ", sProductDocumentNumber)
        ], "Csatolt dokumentumok");
      }.bind(this));
    },

    // ====== Karbantartási utasítás - berendezéshez (EQUI) kötve ======
    onShowMaintenanceInstruction: function (oEvent) {
      var oSource = oEvent.getSource();
      var oRowContext = oSource.getBindingContext();
      if (!oRowContext) {
        console.warn("### DEBUG: onShowMaintenanceInstruction - nincs sor kontextus");
        return;
      }

      console.log("[MaintenanceInstruction] sor path:", oRowContext.getPath());

      var oModel = oRowContext.getModel();
      var oEquipmentBinding = oModel.bindList(oRowContext.getPath() + "/_Equipment", undefined, undefined, undefined, {
        $select: "EquiEqunr"
      });

      oEquipmentBinding.requestContexts().then(function (aContexts) {
        console.log("[MaintenanceInstruction] _Equipment találatok száma:", aContexts.length);

        var aEquipmentIds = aContexts
          .map(function (oCtx) {
            var sVal = oCtx.getProperty("EquiEqunr");
            var sPadded = sVal ? ("000000000000000000" + sVal).slice(-18) : sVal;
            console.log("[MaintenanceInstruction] EquiEqunr érték:", JSON.stringify(sVal), "-> paddelve:", sPadded);
            return sPadded;
          })
          .filter(Boolean);

        console.log("[MaintenanceInstruction] végleges equipment ID lista:", aEquipmentIds);

        if (!aEquipmentIds.length) {
          MessageToast.show("Nincs berendezés rendelve ehhez a munkahelyhez.");
          return;
        }

        var oEquipmentFilter = new Filter({
          filters: aEquipmentIds.map(function (sEquipmentId) {
            return new Filter("BoObjKey", "EQ", sEquipmentId);
          }),
          and: false
        });

        this._showGosDocumentsDialog(oSource, [
          new Filter("BoObjType", "EQ", "EQUI"),
          oEquipmentFilter
        ], "Karbantartási utasítás");
      }.bind(this)).catch(function (oError) {
        console.log("[SessionObjectPageController] hiba a berendezések lekérésekor:", oError);
      });
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

      oBindingContext.requestProperty(["ToSemObj", "ToSemAction", "ToGroupId"])
        .then(function (aValues) {
          var sToSemObj = aValues[0];
          var sToSemAction = aValues[1];
          var sToGroupId = aValues[2];

          if (!sToSemObj || !sToSemAction) return;

          var oNavArgs = {
            target: { semanticObject: sToSemObj, action: sToSemAction }
          };

          if (sToGroupId) {
            oNavArgs.params = { GroupId: sToGroupId };
          }

          sap.ushell.Container.getService("CrossApplicationNavigation").toExternal(oNavArgs);
        });
    }
  });
});