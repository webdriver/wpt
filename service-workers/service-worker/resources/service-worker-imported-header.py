def main(request, response):
    # Set mode to 'init' for initial fetch.
    mode = 'init'
    if 'mode' in request.cookies:
        mode = request.cookies['mode'].value

    # no-cache itself to ensure the user agent finds a new version for each
    # update.
    headers = [('Cache-Control', 'no-cache, must-revalidate'),
               ('Pragma', 'no-cache'),
               ('Content-Type', 'application/javascript')]
    body = '// Service Worker imported script'

    service_worker_header = request.headers.get('service-worker')

    if mode != 'init' and service_worker_header == 'script':
        return 400, [('Content-Type', 'text/plain')], 'Bad Request'

    response.set_cookie('mode', 'normal')
    return 200, headers, body
