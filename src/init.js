'use strict';

// global tim options
if( global.NODE === undefined ) global.NODE = true;
if( global.CHECK === undefined ) global.CHECK = true;

if( !global.tim ) require( '@timberdoodle/tim' );
require( '@timberdoodle/timberman' );
require( '@csc1/passlock' );

const pkg = tim.register( 'gitengine', module, 'src/', 'init.js' );
const gitengine = pkg.require( 'Self.js' );
gitengine._init( pkg.dir );

module.exports = gitengine;
