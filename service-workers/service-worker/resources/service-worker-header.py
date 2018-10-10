def main(request, response):
  header_required = 'header' in request.GET
  service_worker_header = request.headers.get('service-worker')

  if (header_required != (service_worker_header == 'script')):
  # if (header_required and (service_worker_header != 'script')) or \
  #         (not header_required and (service_worker_header == 'script')):
    return 400, [('Content-Type', 'text/plain')], 'Bad Request'

  body = ''
  if 'import' in request.GET:
    import_script = request.GET['import']
    body += 'importScripts(' + import_script + ');';
  else:
    body += '// Request has `Service-Worker: script` header'
  return 200, [('Content-Type', 'application/javascript')], body
