from django.urls import path
from apps.messaging.infrastructure.http.controllers.ConversationController import (
    ConversationDetailView,
    ConversationListCreateView,
    ConversationMessagesView,
    ConversationReadView,
    ConversationWithGuestView,
    UnreadCountView,
)

urlpatterns = [
    path('unread-count/', UnreadCountView.as_view(), name='messaging-unread-count'),
    path('conversations/', ConversationListCreateView.as_view(), name='messaging-conversation-list'),
    path('conversations/avec-voyageur/', ConversationWithGuestView.as_view(), name='messaging-conversation-with-guest'),
    path('conversations/<uuid:conversation_id>/', ConversationDetailView.as_view(), name='messaging-conversation-detail'),
    path('conversations/<uuid:conversation_id>/messages/', ConversationMessagesView.as_view(), name='messaging-conversation-messages'),
    path('conversations/<uuid:conversation_id>/read/', ConversationReadView.as_view(), name='messaging-conversation-read'),
]
