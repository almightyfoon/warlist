<?php
header('Access-Control-Allow-Origin: *');  

set_include_path(get_include_path() . PATH_SEPARATOR . '/home/conflic1/public_html/vendor/google/apiclient/src');
require_once '/home/conflic1/public_html/vendor/autoload.php';
require_once 'authinc.php';

//session_start();

$mysqli = getDB();


$q = 'SELECT post_type, DATE_FORMAT(posted, \'%M %D %Y\') as date_posted, title, post_text FROM blog ORDER BY posted DESC;';
$results = $mysqli->query($q);
$rows = array();

while( $r = $results->fetch_assoc() )
{
	$rows[] = $r;
}

print json_encode($rows);

?>



