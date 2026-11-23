namespace VtuberFriends;
public static class ShutdownTasks
{
 public static async Task TryAsync(Func<Task> cleanup,TimeSpan timeout,Action failed){
  try{await cleanup().WaitAsync(timeout);}catch{failed();}
 }
}
