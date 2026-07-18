
//namespace ccapi {

    export function ajax(url: string, callback: (resp: string) => void, onError?: () => void): void {
        let xhttp = new XMLHttpRequest();

        xhttp.onreadystatechange = function () {
            if (xhttp.readyState == 4) {
                if (xhttp.status == 200) callback(xhttp.responseText);
                else onError?.();
            }
        };

        xhttp.open("GET", url, true);
        xhttp.send();
    }


//}