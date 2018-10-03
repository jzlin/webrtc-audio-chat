using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace WebRTC_DotNetCore.Hubs
{
    public class WebRTCHub : Hub
    {
        public WebRTCHub()
        {
        }

        public Task HeartBeat()
        {
            return Clients.Client(Context.ConnectionId).SendAsync(nameof(HeartBeat), "I'm alive");
        }

        public Task JoinGroup(string name)
        {
            return Groups.AddToGroupAsync(Context.ConnectionId, name);
        }

        public Task LeaveGroup(string name)
        {
            return Groups.RemoveFromGroupAsync(Context.ConnectionId, name);
        }
        
        public Task CreatedOffer(string groupName, object description)
        {
            return Clients.OthersInGroup(groupName).SendAsync("OnCreatedOffer", description);
        }

        public Task CreatedAnswer(string groupName, object description)
        {
            return Clients.OthersInGroup(groupName).SendAsync("OnCreatedAnswer", description);
        }

        public Task IceCandidate(string groupName, object data) 
        {
            return Clients.OthersInGroup(groupName).SendAsync("OnIceCandidate", data);
        }

        public Task CallAction(string groupName, object data)
        {
            return Clients.OthersInGroup(groupName).SendAsync("OnCallAction", data);
        }

        public Task AcceptCall(string groupName, object data)
        {
            return Clients.OthersInGroup(groupName).SendAsync("OnAcceptCall", data);
        }

        public Task HangupAction(string groupName, object data)
        {
            return Clients.OthersInGroup(groupName).SendAsync("OnHangupAction", data);
        }
    }
}