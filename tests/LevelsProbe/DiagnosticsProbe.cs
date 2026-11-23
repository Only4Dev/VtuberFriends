using VtuberFriends;
public static class DiagnosticsProbe
{
    public static void Run()
    {
        var diagnostics = new AudioDiagnostics();
        diagnostics.ObserveManaged("Init dave protocol session, version 1");
        if (diagnostics.EstablishedProtocolVersion != 0) throw new Exception("Init no prueba MLS establecido.");
        diagnostics.ObserveNative("Successfully processed MLS commit, updating state; our leaf index is 0; current epoch is 1");
        if (diagnostics.EstablishedProtocolVersion != 1) throw new Exception("Transicion inicial no observada.");
        diagnostics.ObserveNative("Resetting MLS session");
        if (diagnostics.EstablishedProtocolVersion != 0) throw new Exception("Reset no invalida MLS.");
        for (int i = 0; i < 10000; i++)
            diagnostics.ObserveNative("Key package: TEST_SECRET_MUST_NOT_BE_LOGGED");
        if (diagnostics.Fatal.IsCompleted) throw new Exception("El ruido informativo disparó el corte.");
        diagnostics.ObserveNative("MLS welcome lists unrecognized user ID");
        diagnostics.ObserveNative("MLS welcome lists unrecognized user ID");
        if (diagnostics.Fatal.IsCompleted) throw new Exception("Corte prematuro.");
        diagnostics.ObserveNative("MLS welcome lists unrecognized user ID");
        if (!diagnostics.Fatal.IsCompletedSuccessfully || diagnostics.Fatal.Result != "DAVE_MLS_REJECTED_USERS")
            throw new Exception("El bucle MLS no dispara el corte.");
        diagnostics.ObserveNative("Attempted to verify credential for unrecognized user ID: 925635811020517407");
        diagnostics.ObserveManaged("Processing MLS proposal; our users: [123456789012345678, 925635811020517407]");
        string state = System.Text.Json.JsonSerializer.Serialize(diagnostics.Snapshot);
        if (!state.Contains("925635811020517407") || !state.Contains("123456789012345678")) throw new Exception("Faltan IDs diagnosticos.");
        if (state.Contains("TEST_SECRET")) throw new Exception("Payload nativo expuesto.");
        diagnostics.ObserveNative("Decrypt failed, no valid cryptor found");
        if (diagnostics.RecordWarning("Failed to decrypt audio packet for 925635811020517407: DecryptionFailure") != "DAVE_DECRYPT_DecryptionFailure")
            throw new Exception("No clasifica el fallo de audio.");
        if (diagnostics.RecordWarning("Unknown OpCode (15)") != "VOICE_OPCODE_15")
            throw new Exception("No clasifica opcode.");
        var summary = System.Text.Json.JsonSerializer.SerializeToElement(diagnostics.Snapshot);
        if (summary.GetProperty("warningsLast60Seconds").GetInt32() != 2
            || summary.GetProperty("decryptFailuresLast60Seconds").GetInt32() != 1)
            throw new Exception("Contadores recientes incorrectos.");
        Console.WriteLine("PASS: avisos por causa y contadores recientes independientes del historico.");
        Console.WriteLine("PASS: 10000 logs nativos sin salida/payload almacenado, corte tras tres rechazos MLS.");
    }
}
