import shutil
shutil.rmtree('dist',ignore_errors=True)
shutil.copytree('public','dist')
print('Fresh static build ready in dist')
