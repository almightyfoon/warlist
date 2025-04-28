<?php
header('Access-Control-Allow-Origin: *');  

set_include_path(get_include_path() . PATH_SEPARATOR . '/home/conflic1/public_html/vendor/google/apiclient/src');
require_once '/home/conflic1/public_html/vendor/autoload.php';
require_once 'authinc.php';

//session_start();

function startsWith($haystack, $needle)
{
     $length = strlen($needle);
     return (substr($haystack, 0, $length) === $needle);
}



$tourn = $_POST['tourn'];

$td = json_decode($tourn);


$v = strtolower($td->venue);
$v2 = "";

if( startsWith($v, "https://www.facebook.com/") )
{
    $v2 = substr($v, 25);
} 
else if( startsWith($v, "http://www.facebook.com/") )
{
    $v2 = substr($v, 24);
}

echo $v2 . "\n";

if( $v2 != "" )
{
		try
		{
			$fb = new Facebook\Facebook([
				'app_id' => '1825213381039783',
				'default_graph_version' => 'v2.5'
			]);


            $loc1 = strrpos($v2, '-');

            if( $loc1 === FALSE )
            {
                try
                {
                    $response = $fb->get('/' . $v2 .  '?fields=id,name,cover,single_line_address,picture,link,location', '');

                    //echo $response->getBody();
                    $td->venuefull = json_decode($response->getBody());
                }
                catch(Exception $e)
                {

                }
            }
            else
            {
                try
                {
                    $v3 = substr($v2, $loc1+1);
                    $response = $fb->get('/' . $v3 .  '?fields=id,name,cover,single_line_address,picture,link,location', '');
                    $td->venuefull = json_decode($response->getBody());
                }
                catch(Exception $e)
                {

                    try
                    {
                        $response = $fb->get('/' . $v2 .  '?fields=id,name,cover,single_line_address,picture,link,location', '');
                        $td->venuefull = json_decode($response->getBody());
                    }
                    catch(Exception $e)
                    {

                    }
                }

            }



		}
		catch(Exception $e)
		{
			echo 'Exception getting FB object<br>';
			echo '<pre>';
			print_r($e);
			echo '</pre>';
			return -1;
		}
    
}

$td->venue2 = $v2;

print_r($td);

$je = json_encode($td);

echo $je;


echo 'encoded';

$mysqli = getDB();


$jeq = mysqli_real_escape_string($mysqli, $je);

print_r($jeq);




$q = 'INSERT INTO tournaments(startdate, jsondata, approved) VALUES(\''
    . mysqli_real_escape_string($mysqli, $td->date) . '\', \''
    . $jeq . '\', 0);';

echo $q;

$mysqli->query($q);



?>
