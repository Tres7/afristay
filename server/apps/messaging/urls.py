from django.urls import path
from .views import ConversationListCreateView, ConversationMessagesView

urlpatterns = [
    path('', ConversationListCreateView.as_view(), name='conversation-list'),
    path('<uuid:pk>/messages/', ConversationMessagesView.as_view(), name='conversation-messages'),
]
