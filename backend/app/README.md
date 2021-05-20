python manage.py makemigrations tfanalysis

python manage.py makemigrations
python manage.py migrate
python manage.py migrate tfanalysis --database tfanalysis
python manage.py shell
from tfanalysis.models import DefaultProcessingSettings
a = DefaultProcessingSettings(file_type='example_csv')
a.save()
quit()
