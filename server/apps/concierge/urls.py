from django.urls import path

from .views import ConversationsView, ConversationView, MessagesView, StatutView

urlpatterns = [
    path('statut/', StatutView.as_view(), name='concierge-statut'),
    path('conversations/', ConversationsView.as_view(), name='concierge-conversations'),
    path('conversations/<uuid:pk>/', ConversationView.as_view(), name='concierge-conversation'),
    path('conversations/<uuid:pk>/messages/', MessagesView.as_view(), name='concierge-messages'),
]
