// 
//  change-object
//  Written by Will Brickner
//
//  See README or LICENSE for more information.
//

const nestedAccessRegExp = new RegExp(/[\s\S]*->[\s\S]*/i)

function findParentOfTerminalNode(object, pathComponents) {
	const indexLimit = pathComponents.length - 1
	let index = 0

	while ((index < indexLimit) && object[pathComponents[index]].hasOwnProperty(pathComponents[index + 1])) {
		object = object[pathComponents[index]]
		index++
	}

	return object
}

function lastElement(arr) { return arr[arr.length - 1] }

function applySetOperations(object, updateDescription) {
	for (var key in (updateDescription.set || {})) {
		// top-level properties take precedence over nested properties
		if (!object.hasOwnProperty(key) && nestedAccessRegExp.test(key)) {
			// we know we want to modify a nested property
			let components = key.split("->")
			let parentOfTerminalNode = findParentOfTerminalNode(object, components)

			parentOfTerminalNode[lastElement(components)] = updateDescription.set[key]
		} else {
			// set a top-level property
			object[key] = updateDescription.set[key]
		}
	}
}

function applyUnsetOperations(object, updateDescription) {
	for (var key in (updateDescription.unset || {})) {
		// top-level properties take precedence over nested properties
		if (!object.hasOwnProperty(key) && nestedAccessRegExp.test(key)) {
			// we know we want to modify a nested property
			let components = key.split("->")
			let parentOfTerminalNode = findParentOfTerminalNode(object, components)

			delete parentOfTerminalNode[lastElement(components)]
		} else {
			// set a top-level property
			delete object[key]
		}
	}
}

function applyInsertionOperations(object, updateDescription) {
	// add items to array
	for (var key in (updateDescription.insert || {})) {
		// top-level properties take precedence over nested properties
		if (!object.hasOwnProperty(key) && nestedAccessRegExp.test(key)) {
			// we know we want to modify a nested property
			let components = key.split("->")
			let parentOfTerminalNode = findParentOfTerminalNode(object, components)
			let terminalNode = parentOfTerminalNode[lastElement(components)]

			// insert each item at the end
			for (var j = 0, jlen = updateDescription.insert[key].length; j < jlen; ++j) {
				terminalNode.push(
					updateDescription.insert[key][j]
				)
			}
		} else {
			// insert into a top-level property
			// insert each item at the end
			for (var j = 0, jlen = updateDescription.insert[key].length; j < jlen; ++j) {
				object[key].push(
					updateDescription.insert[key][j]
				)
			}
		}
	}
}

function applyRemovalOperations(object, updateDescription) {
	// remove items from array or object conditionally
	for (var key in (updateDescription.remove || {})) {
		let matchingFunction
		if (typeof updateDescription.remove[key] === "function") {
			matchingFunction = updateDescription.remove[key]
		} else if (typeof updateDescription.remove[key] === "string") {
			matchingFunction = new Function(updateDescription.remove[key])
		} else {
			// Matching function provided is neither a function or a function-string.  Skipping removal for key.
			continue
		}

		// top-level properties take precedence over nested properties
		if (!object.hasOwnProperty(key) && nestedAccessRegExp.test(key)) {
			// we know we want to modify a nested property
			let components = key.split("->")
			let parentOfTerminalNode = findParentOfTerminalNode(object, components)
			let terminalNode = parentOfTerminalNode[lastElement(components)]

			// let's remove the elements that cannot stay
			if (terminalNode instanceof Array) {
				for (var j = 0, jlen = terminalNode.length; j < jlen; ++j) {
					if (matchingFunction(j, terminalNode[j])) {
						// delete this element, the matching function says it cannot stay
						terminalNode.splice(j, 1)
					}
				}
			} else if (terminalNode instanceof Object) {
				for (var innerKey in terminalNode) {
					if (matchingFunction(innerKey, terminalNode[innerKey])) {
						// delete this element, the matching function says it cannot stay
						delete terminalNode[innerKey]
					}
				}
			} 
		} else {
			// let's remove the elements that cannot stay
			if (object[key] instanceof Array) {
				for (var j = 0, jlen = object[key].length; j < jlen; ++j) {
					if (matchingFunction(j, object[key][j])) {
						// delete this element (in place), the matching function says it cannot stay
						object[key].splice(j, 1)
					}
				}
			} else if (object[key] instanceof Object) {
				for (var innerKey in object[key]) {
					if (matchingFunction(innerKey, object[key][innerKey])) {
						// delete this element, the matching function says it cannot stay
						delete object[key][innerKey]
					}
				}
			}
		}
	}
}

function applyModificationOperations(object, updateDescription) {
	for (var key in (updateDescription.modify || {})) {
		let modificationFunction
		if (typeof updateDescription.modify[key] === "function") {
			modificationFunction = updateDescription.modify[key]
		} else if (typeof updateDescription.modify[key] === "string") {
			modificationFunction = new Function(updateDescription.modify[key])
		} else {
			// Mutation function provided is neither a function or a function-string.  Skipping mutation for key.
			continue
		}

		// top-level properties take precedence over nested properties
		if (!object.hasOwnProperty(key) && nestedAccessRegExp.test(key)) {
			// we know we want to modify a nested property
			let components = key.split("->")
			let parentOfTerminalNode = findParentOfTerminalNode(object, components)
			let terminalNode = parentOfTerminalNode[lastElement(components)]

			modificationFunction(terminalNode, parentOfTerminalNode)
		} else {
			modificationFunction(object[key], object)
		}
	}
}

module.exports = function updateObject(object = {}, updateDescription = {}) {
	applySetOperations(object, updateDescription)
	applyUnsetOperations(object, updateDescription)
	applyInsertionOperations(object, updateDescription)
	applyRemovalOperations(object, updateDescription)
	applyModificationOperations(object, updateDescription)
}