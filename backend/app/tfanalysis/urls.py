from django.urls import path
from . import views

urlpatterns = [
    path('tfanalysis/fetchparsers/', views.FetchParsers.as_view()),
    path('tfanalysis/upload/', views.UploadData.as_view()),
    path('tfanalysis/fetchexperiments/', views.FetchExperiments.as_view()),
    path('tfanalysis/fetchsampleinfo/', views.FetchSampleInfo.as_view()),
    path('tfanalysis/updatesampleinfo/', views.UpdateSampleInfo.as_view()),
    path('tfanalysis/fetchprocessingsettings/', views.FetchProcessingSettings.as_view()),
    path('tfanalysis/updateprocessingsettings/', views.UpdateProcessingSettings.as_view()),
    path('tfanalysis/processdata/', views.ProcessData.as_view()),
]
