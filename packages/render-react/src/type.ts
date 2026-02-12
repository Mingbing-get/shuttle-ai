import '@shuttle-ai/type'

declare module '@shuttle-ai/type' {
  export namespace ShuttleAi {
    export namespace Client {
      export namespace Agent {
        export interface RenderTool {
          Render: React.FC<any>
        }
      }

      export namespace ReactRender {
        export interface Context {}
      }
    }
  }
}
