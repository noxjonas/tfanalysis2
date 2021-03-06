from django.urls import path
import tfanalysis.views as views

urlpatterns = [
    path('tfanalysis/fetchparsers/', views.FetchParsers.as_view()),
    path('tfanalysis/uploaddata/', views.UploadData.as_view()),
    path('tfanalysis/fetchexperiments/', views.FetchExperiments.as_view()),
    path('tfanalysis/updateexperimentinfo/', views.UpdateExperimentInfo.as_view()),
    path('tfanalysis/deleteexperiment/', views.DeleteExperiment.as_view()),

    path('tfanalysis/fetchsampleinfo/', views.FetchSampleInfo.as_view()),
    path('tfanalysis/updatesampleinfo/', views.UpdateSampleInfo.as_view()),
    path('tfanalysis/uploadsampleinfo/', views.UploadSampleInfo.as_view()),
    path('tfanalysis/savesampleinfoscreen/', views.SaveSampleInfoScreen.as_view()),
    path('tfanalysis/fetchsampleinfoscreensnames/', views.FetchSampleInfoScreensNames.as_view()),
    path('tfanalysis/deletesampleinfoscreen/', views.DeleteSampleInfoScreen.as_view()),
    path('tfanalysis/fetchsampleinfoscreen/', views.FetchSampleInfoScreen.as_view()),


    path('tfanalysis/fetchtransitionprocessingsettings/', views.FetchTransitionProcessingSettings.as_view()),
    path('tfanalysis/updatetransitionprocessingsettings/', views.UpdateTransitionProcessingSettings.as_view()),
    path('tfanalysis/resettransitionprocessingsettings/', views.ResetTransitionProcessingSettings.as_view()),
    path('tfanalysis/previewtransitionprocessing/', views.PreviewTransitionProcessing.as_view()),
    path('tfanalysis/processtransitiondata/', views.ProcessTransitionData.as_view()),

    path('tfanalysis/fetchpeakfindingsettings/', views.FetchPeakFindingSettings.as_view()),
    path('tfanalysis/updatepeakfindingsettings/', views.UpdatePeakFindingSettings.as_view()),
    path('tfanalysis/resetpeakfindingsettings/', views.ResetPeakFindingSettings.as_view()),
    path('tfanalysis/findpeaks/', views.FindPeaks.as_view()),



]
