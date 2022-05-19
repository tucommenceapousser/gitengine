'use strict';

// global tim options
if( global.NODE === undefined ) global.NODE = true;
if( global.CHECK === undefined ) global.CHECK = true;

if( !global.tim ) require( '@timberdoodle/tim' );
require( '@csc1/passlock' );

module.exports =
	tim
	.register( 'gitengine', module, 'src/', 'init.js' )
	.require( 'Self.js' );
