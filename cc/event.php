<?php
header('Access-Control-Allow-Origin: *');  

set_include_path(get_include_path() . PATH_SEPARATOR . '/home/conflic1/public_html/vendor/google/apiclient/src');
require_once '/home/conflic1/public_html/vendor/autoload.php';
require_once 'authinc.php';

//session_start();

$eid = $_POST['eid'];

$mysqli = getDB();

$q = 'SELECT name, cover, inset, url, address, venue_name FROM events WHERE uid=' 
    . $mysqli->escape_string($eid) 
    . ';';


$results = $mysqli->query($q);
// $rows = array();

if( $r = $results->fetch_assoc() )
{
    print json_encode($r);
}

?>



