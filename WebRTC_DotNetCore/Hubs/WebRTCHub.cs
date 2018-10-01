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
        
        public Task CreatedOffer(object description)
        {
            return Clients.All.SendAsync("OnCreatedOffer", description);
        }

        public Task CreatedAnswer(object description)
        {
            return Clients.All.SendAsync("OnCreatedAnswer", description);
        }

        public Task IceCandidate(object data) 
        {
            return Clients.All.SendAsync("OnIceCandidate", data);
        }

        public Task HangupAction()
        {
            return Clients.All.SendAsync("OnHangupAction");
        }
    }
}