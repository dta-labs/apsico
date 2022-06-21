(function ($) {
	var initLayout = function () {
		var d1 = new Date();
		var d2 = new Date();
		d2.setDate(d2.getDate() + 10);
		$('#datepicker').DatePicker({
			flat: true,
			date: [d1, d2],
			current: d1,
			calendars: 2,
			mode: 'range',
			starts: 1,
			onChange: function(formated) {
				document.querySelector('#datepicker').value = formated.join(' ~ ');
			}
		});
		// document.querySelector('#date3 .datepicker').style.display = "none !important";
	};

	EYE.register(initLayout, 'init');
})(jQuery)