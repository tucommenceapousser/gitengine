'use strict';

const fs = require( 'fs/promises' );

// global tim options
if( global.NODE === undefined ) global.NODE = true;
if( global.CHECK === undefined ) global.CHECK = true;

if( !global.tim ) require( '@timberdoodle/tim' );

const gitengine = tim.register( 'gitengine', module, 'src/', 'Overleaf/Test.js' );

const Client = gitengine.require( 'Overleaf/Client.js' );

const client = Client.Client( 'https://overleaf.csc.univie.ac.at' );

(async function( ){
	await client.login( 'web.csc@univie.ac.at', 'seragiwvyl' );
	const data = await client.downloadZip( '6033a0935c33c6008edc3705' );
	await fs.writeFile( 'test.zip', data );
})( );


