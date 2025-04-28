<?php

if( CC_ALPHA )
{
    if( $_SERVER['REMOTE_ADDR'] != '24.196.146.229'
        && $_SERVER['REMOTE_ADDR'] != '128.105.136.11' 
        && $_SERVER['REMOTE_ADDR'] != '68.188.207.224' )
    {
        die('Invalid access');
    }
}

// session_start();

// if( $_SERVER['QUERY_STRING'] && strlen($_SERVER['QUERY_STRING']) > 0 )
// {
//     $_SESSION['QSTR'] = $_SERVER['QUERY_STRING'];
//     header('Location: CC_URL' ) ;
// }

?>

