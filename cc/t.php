<?php
header('Access-Control-Allow-Origin: *');  

set_include_path(get_include_path() . PATH_SEPARATOR . '/home/conflic1/public_html/vendor/google/apiclient/src');
require_once '/home/conflic1/public_html/vendor/autoload.php';
require_once 'authinc.php';


$mysqli = getDB();

if( $_SERVER['REMOTE_ADDR'] == '24.196.146.229'
 || $_SERVER['REMOTE_ADDR'] == '128.105.136.11' 
 || $_SERVER['REMOTE_ADDR'] == '68.188.207.224')
{
    $q = 'SELECT * FROM tournaments ORDER BY startdate DESC;';
}
else
{
    $q = 'SELECT * FROM tournaments WHERE approved > 0 ORDER BY startdate DESC;';
}


$results = $mysqli->query($q);


$rows = array();

while( $r = $results->fetch_assoc() )
{
	$rows[] = $r;
}

print json_encode($rows);


?>
