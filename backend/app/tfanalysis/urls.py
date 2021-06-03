from django.urls import path
from . import views

urlpatterns = [
    path('tfanalysis/fetchparsers/', views.FetchParsers.as_view()),
    path('tfanalysis/upload/', views.UploadData.as_view()),
    path('tfanalysis/fetchexperiments/', views.FetchExperiments.as_view()),
    path('tfanalysis/updateexperimentinfo/', views.UpdateExperimentInfo.as_view()),
    path('tfanalysis/deleteexperiment/', views.DeleteExperiment.as_view()),
    path('tfanalysis/fetchsampleinfo/', views.FetchSampleInfo.as_view()),
    path('tfanalysis/updatesampleinfo/', views.UpdateSampleInfo.as_view()),
    path('tfanalysis/fetchtransitionprocessingsettings/', views.FetchTransitionProcessingSettings.as_view()),
    path('tfanalysis/updatetransitionprocessingsettings/', views.UpdateTransitionProcessingSettings.as_view()),
    path('tfanalysis/resettransitionprocessingsettings/', views.ResetTransitionProcessingSettings.as_view()),
    path('tfanalysis/previewtransitionprocessing/', views.PreviewTransitionProcessing.as_view()),
    path('tfanalysis/processtransitiondata/', views.ProcessTransitionData.as_view()),
]
