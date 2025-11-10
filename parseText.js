const url = "./rawGTree.txt"
let gTree;
fetch(url)
    .then(result => result.text())
    .then(data => {
        gTree = JSON.parse(data);
    })
	.catch(error => {
		console.log("Error in parsing text: " + error)
    })