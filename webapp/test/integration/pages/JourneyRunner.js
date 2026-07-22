sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"zmes/zmesppoplist/test/integration/pages/SessionObjectPage"
], function (JourneyRunner, SessionObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('zmes/zmesppoplist') + '/test/flp.html#app-preview',
        pages: {
			onTheSessionObjectPage: SessionObjectPage
        },
        async: true
    });

    return runner;
});

