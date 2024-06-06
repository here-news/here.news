function timeSince(date) {
    var seconds = Math.floor((new Date() - date) / 1000);
    var interval = seconds / 31536000; // Number of seconds in one year

    if (interval > 1) {
        return Math.floor(interval) + " years ago";
    }
    interval = seconds / 2592000; // Number of seconds in one month
    if (interval > 1) {
        return Math.floor(interval) + " months ago";
    }
    interval = seconds / 86400; // Number of seconds in one day
    if (interval > 1) {
        return Math.floor(interval) + " days ago";
    }
    interval = seconds / 3600; // Number of seconds in one hour
    if (interval > 1) {
        return Math.floor(interval) + " hours ago";
    }
    interval = seconds / 60; // Number of seconds in one minute
    if (interval > 1) {
        return Math.floor(interval) + " minutes ago";
    }
    return Math.floor(seconds) + " seconds ago";
}
function updateTimestamps() {
    var timestamps = document.querySelectorAll('.timestamp');
    timestamps.forEach(function(timestamp) {
        var utcDate = new Date(timestamp.getAttribute('data-date'));
        var localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
        timestamp.innerText = timeSince(localDate) ;
    });
}