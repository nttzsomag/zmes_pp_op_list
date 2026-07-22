sap.ui.define([], function () {
    "use strict";

    return {
        openScanDialog: function (fnCallback) {
            var oInput = new sap.m.Input({
                placeholder: "Vonalkód...",
                width: "100%"
            });

            var fnScan = function () {
                var sBarcode = oInput.getValue();
                if (!sBarcode) return;
                oDialog.close();
                fnCallback(sBarcode);
            };

            var oDialog = new sap.m.Dialog({
                title: "Vonalkód beolvasás",
                content: [oInput],
                buttons: [
                    new sap.m.Button({ text: "Keresés", type: "Emphasized", press: fnScan }),
                    new sap.m.Button({ text: "Mégsem", press: function () { oDialog.close(); } })
                ],
                afterClose: function () { oDialog.destroy(); }
            });

            oInput.attachSubmit(fnScan);
            oDialog.open();
        },

        onScanBarcode: function () {
            // placeholder - manifestből hívódik, de nem csinál semmit
        },

        onClearScan: function () {
            // placeholder - controller inicializálja
        }

    };
});