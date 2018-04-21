var q = {};

exports.add2Q = function (msg){
	console.log("Adding message to queue: ", msg)
	if(msg.destination in q){
		q[msg.destination].push(msg);
	}else{
		q[msg.destination]=[msg];
	}

}

exports.getMsg = function (dst){
	console.log("Get first message in queue!");
	if (dst in q) {
		if(typeof q[dst] != "undefined" && q[dst] != null && q[dst].length != null && q[dst].length > 0){
			console.log("Message found!");
			return q.shift();
		}
	}
	console.log("No messages in queue!");
	return null;
}

/*
module.exports = {
	q, q,
	add2Q: add2Q.
	getMsg: getMsg
}
*/