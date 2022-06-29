/*
| The data about an overleaf project.
*/
'use strict';

def.attributes =
{
	// the overleaf id
	id: { type: [ 'string' ], },

	// the semaphore for this project
	semaphore: { type: [ 'Util/Semaphore' ], },
};
