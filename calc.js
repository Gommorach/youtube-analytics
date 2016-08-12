
module.exports = function() {
	this.timeCheck = function(date1) {
		var timeDiff = 24 * 60 * 60 * 1000; // day in milliseconds
		return Date.now() - date1.getTime() < timeDiff;		
	}
}