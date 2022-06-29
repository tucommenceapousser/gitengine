/*
| Manages the overleaf projects.
*/
'use strict';

def.abstract = true;

const OverleafProject = tim.require( 'Overleaf/Project/Self' );
const OverleafProjectGroup = tim.require( 'Overleaf/Project/Group' );
const Semaphore = tim.require( 'Util/Semaphore' );

/*
| The projects.
*/
let _projects;

/*
| Initalizes the overleaf project manager.
*/
def.static.init =
	function( )
{
	_projects = OverleafProjectGroup.Empty;
};

/*
| Releases a project semaphore.
|
| ~name: name of the repository.
| ~flag: semaphore flag.
*/
def.static.releaseSemaphore =
	function( name, flag )
{
	_projects.get( name ).release( flag );
};

/*
| Requests an project semaphore.
|
| ~name: name of the repository.
|
| ~return: the semaphore flag.
*/
def.static.requestSemaphore =
	async function( id )
{
	let project = _projects.get( name );
	if( !project )
	{
		project = OverleafProject.create( 'id', id, 'semaphore', Semaphore.create( ) );
		_projects = _projects.set( id, project );
	}
	return await project.semaphore.request( );
};
